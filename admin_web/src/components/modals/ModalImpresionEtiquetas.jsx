/* eslint-disable react/prop-types */
import React, { useState, useMemo } from 'react';
import { Printer, X, Tag, Settings } from 'lucide-react';
import LabelPrinter from '../common/LabelPrinter';

/**
 * ModalImpresionEtiquetas
 * 
 * Permite previsualizar y configurar la impresión de etiquetas térmicas.
 * Genera una lista de etiquetas basada en los items y unidades de la factura.
 */
const ModalImpresionEtiquetas = ({ factura, onClose, companyName = "PROLOGIX" }) => {
    const [selectedSize, setSelectedSize] = useState("4x2"); // Default: Items individuales

    // Generar datos para todas las etiquetas (una por cada unidad física)
    const labels = useMemo(() => {
        if (!factura) return [];

        let generated = [];

        // Iterar sobre items
        if (factura.items) {
            factura.items.forEach((item, itemIdx) => {
                const qty = item.cantidad || 1;
                // Generar una etiqueta por cada unidad
                for (let i = 0; i < qty; i++) {
                    generated.push({
                        uniqueCode: `${factura.codigoTracking}-${itemIdx}-${i}`, // ID Único para escaneo
                        tracking: factura.codigoTracking,
                        itemDesc: item.descripcion || item.producto || "Item Sin Descripción",
                        itemIndex: itemIdx,
                        unitIndex: i,
                        totalUnits: qty,
                        recipientName: factura.destinatario?.nombre || "Cliente General",
                        date: new Date().toLocaleDateString('es-DO'),
                    });
                }
            });
        }
        return generated;
    }, [factura]);

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[9000]">
            {/* Interfaz del Modal (Oculta al imprimir) */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg no-print animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-100 dark:bg-indigo-900/30 p-2 rounded-lg text-indigo-600 dark:text-indigo-400">
                            <Tag size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Imprimir Etiquetas</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{factura.codigoTracking}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6">
                    {/* Selector de Tamaño */}
                    <div className="mb-6">
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                            <Settings size={16} />
                            Configuración de Impresión
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setSelectedSize("4x2")}
                                className={`flex flex-col items-center justify-center p-3 border-2 rounded-xl transition-all ${selectedSize === "4x2"
                                        ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300"
                                        : "border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-slate-600"
                                    }`}
                            >
                                <span className="font-bold text-lg">4" x 2"</span>
                                <span className="text-xs opacity-80">Etiqueta Item</span>
                            </button>
                            <button
                                onClick={() => setSelectedSize("4x6")}
                                className={`flex flex-col items-center justify-center p-3 border-2 rounded-xl transition-all ${selectedSize === "4x6"
                                        ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300"
                                        : "border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-slate-600"
                                    }`}
                            >
                                <span className="font-bold text-lg">4" x 6"</span>
                                <span className="text-xs opacity-80">Etiqueta Envío</span>
                            </button>
                        </div>
                        <p className="text-xs text-slate-500 mt-2 text-center">
                            Asegúrate de configurar tu impresora térmica con el tamaño de papel correcto ({selectedSize === "4x2" ? "101x50mm" : "101x152mm"}).
                        </p>
                    </div>

                    {/* Resumen */}
                    <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl border border-slate-200 dark:border-slate-600 mb-6">
                        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">Resumen de Impresión</h4>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-600 dark:text-slate-400">Total Items:</span>
                                <strong className="text-slate-900 dark:text-white">{factura.items?.length || 0}</strong>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-600 dark:text-slate-400">Total Etiquetas a Generar:</span>
                                <strong className="text-emerald-600 font-bold">{labels.length}</strong>
                            </div>
                        </div>
                    </div>

                    {/* Botones de Acción */}
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="w-1/3 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handlePrint}
                            className="w-2/3 bg-indigo-600 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition-all active:scale-95"
                        >
                            <Printer size={20} />
                            Imprimir {labels.length} Etiquetas
                        </button>
                    </div>
                </div>
            </div>

            {/* COMPONENTE DE IMPRESIÓN (Invisible excepto al imprimir) */}
            <LabelPrinter
                labels={labels}
                companyName={companyName}
                size={selectedSize}
            />
        </div>
    );
};

export default ModalImpresionEtiquetas;
