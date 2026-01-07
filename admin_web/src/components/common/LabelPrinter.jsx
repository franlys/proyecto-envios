/* eslint-disable react/prop-types */
import React from 'react';
import BarcodeGenerator from './BarcodeGenerator';

/**
 * Plantilla de Etiqueta Térmica
 * Soporta tamaños: "4x2" (Items individuales) y "4x6" (Envío completo)
 */
export const LabelTemplate = ({
    uniqueCode, // Código único (TRACKING-UNIT)
    tracking,   // Tracking general
    itemDesc,   // Descripción del item
    itemIndex,
    unitIndex,
    totalUnits, // Total de unidades de este item
    recipientName,
    date,
    companyName = "PROLOGIX",
    size = "4x2"
}) => {
    // Dimensiones
    // 4x2 pulgadas = 101.6mm x 50.8mm
    // 4x6 pulgadas = 101.6mm x 152.4mm

    const isSmall = size === "4x2";

    if (isSmall) {
        return (
            <div
                className="label-container bg-white flex flex-col justify-between overflow-hidden relative"
                style={{
                    width: '101.6mm',
                    height: '50.8mm',
                    padding: '2mm',
                    border: '1px solid #eee', // Borde visible solo en pantalla
                    boxSizing: 'border-box'
                }}
            >
                {/* Header Compacto */}
                <div className="flex justify-between items-center border-b border-black pb-1 mb-1">
                    <span className="font-bold text-[10px] truncate max-w-[60%]">{companyName}</span>
                    <span className="text-[8px]">{date}</span>
                </div>

                {/* Info Principal */}
                <div className="flex-1 flex flex-row gap-2">
                    <div className="flex-1 min-w-0">
                        <p className="font-bold text-[10px] truncate">{recipientName}</p>
                        <p className="text-[9px] truncate leading-tight">{itemDesc}</p>
                        <p className="text-[8px] mt-0.5">Unit {unitIndex + 1} of {totalUnits}</p>
                    </div>
                    {/* QR Opcional si cabe, o solo Barcode abajo */}
                </div>

                {/* Barcode - CODE128 para el código único */}
                <div className="flex flex-col items-center justify-center w-full mt-1">
                    <div className="w-full flex justify-center overflow-hidden" style={{ maxHeight: '25mm' }}>
                        <BarcodeGenerator
                            value={uniqueCode}
                            format="CODE128"
                            width={1.5} // Más estrecho para que quepa
                            height={25}
                            displayValue={false}
                        />
                    </div>
                    <p className="text-[10px] font-mono font-bold leading-none mt-0.5">{uniqueCode}</p>
                </div>
            </div>
        );
    }

    // Plantilla 4x6 (Grande)
    return (
        <div
            className="label-container bg-white flex flex-col items-center justify-between overflow-hidden relative"
            style={{
                width: '101.6mm',
                height: '152.4mm',
                padding: '4mm',
                border: '1px solid #eee'
            }}
        >
            {/* Header */}
            <div className="w-full text-center border-b-2 border-black pb-2">
                <h1 className="text-2xl font-bold uppercase tracking-wider">{companyName}</h1>
                <p className="text-xs mt-1">{date}</p>
            </div>

            {/* Recipient - Large */}
            <div className="w-full text-left py-4">
                <p className="text-xs text-slate-500 uppercase font-bold">DESTINATARIO:</p>
                <h2 className="text-xl font-bold leading-tight line-clamp-3 uppercase">{recipientName}</h2>
            </div>

            {/* Item Info */}
            <div className="w-full text-left border-y-2 border-black py-3 pl-1 bg-slate-50">
                <div className="flex justify-between items-end">
                    <div>
                        <p className="text-xs font-bold text-slate-500">CONTENIDO:</p>
                        <p className="text-sm font-bold uppercase line-clamp-2">{itemDesc}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-bold">{unitIndex + 1}/{totalUnits}</p>
                        <p className="text-[10px]">UNIDADES</p>
                    </div>
                </div>
            </div>

            {/* Barcode - Main Tracking */}
            <div className="flex-1 flex flex-col items-center justify-center w-full my-4">
                <BarcodeGenerator value={uniqueCode} format="CODE128" width={2.5} height={80} displayValue={false} />
                <p className="text-lg font-bold mt-2 font-mono">{uniqueCode}</p>
            </div>

            {/* Footer tracking */}
            <div className="w-full text-center border-t-2 border-black pt-2">
                <p className="text-xs uppercase text-slate-500 mb-1">TRACKING GENERAL</p>
                <p className="text-3xl font-black tracking-tight">{tracking}</p>
            </div>
        </div>
    );
};

// Componente Wrapper para imprimir
const LabelPrinter = ({ labels, companyName, size = "4x2" }) => {
    if (!labels || labels.length === 0) return null;

    return (
        <div className="print-container hidden print:block absolute top-0 left-0 w-full bg-white z-[9999]">
            <style>{`
         @media print {
           @page { 
             size: ${size === "4x2" ? '4in 2in' : '4in 6in'}; 
             margin: 0; 
           }
           body { margin: 0; padding: 0; }
           .no-print { display: none !important; }
           
           /* Forzar saltos de página entre etiquetas */
           .label-container { 
             break-after: page; 
             page-break-after: always; 
             border: none !important;
             margin: 0 !important;
           }
           
           /* Hack para que browsers no añadan márgenes extra */
           html, body {
             height: 100%;
             overflow: hidden; 
           }
           
           .print\\:block { display: block !important; }
         }
       `}</style>

            {labels.map((label, idx) => (
                <LabelTemplate
                    key={idx}
                    {...label}
                    companyName={companyName}
                    size={size}
                />
            ))}
        </div>
    );
};

export default LabelPrinter;
