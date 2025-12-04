import { useState } from 'react';
import ModuloFacturacion from '../ModuloFacturacion';
import { X, Save } from 'lucide-react';
import api from '../../services/api'; // Asumiendo que existe api service, si no usar fetch

const ModalFacturacion = ({ factura, onClose, onUpdate }) => {
    const [loading, setLoading] = useState(false);
    const [facturacionData, setFacturacionData] = useState(factura.facturacion || {});
    const [items, setItems] = useState(factura.items || []);

    const handleGuardar = async () => {
        // ✅ Prevenir cambios si la factura original estaba pagada
        const estadoOriginal = factura.facturacion?.estadoPago || factura.estadoPago;
        const estadoNuevo = facturacionData.estadoPago;

        // Si el estado original era 'pagada' y se intenta cambiar, bloquear
        if (estadoOriginal === 'pagada' && estadoNuevo !== 'pagada') {
            alert('⚠️ No se puede cambiar el estado de una factura que ya está pagada.');
            return;
        }

        setLoading(true);
        try {
            // Usar endpoint existente para actualizar facturación
            // PUT /api/facturacion/recolecciones/:id
            const token = localStorage.getItem('token');
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

            const response = await fetch(`${apiUrl}/facturacion/recolecciones/${factura.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...facturacionData,
                    items: items
                })
            });

            const data = await response.json();

            if (data.success) {
                alert('Facturación actualizada exitosamente');
                if (onUpdate) onUpdate();
                onClose();
            } else {
                alert('Error: ' + (data.error || 'No se pudo guardar'));
            }
        } catch (error) {
            console.error('Error guardando facturación:', error);
            alert('Error al guardar los cambios');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                        Gestionar Factura - {factura.codigoTracking || factura.id}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    <ModuloFacturacion
                        items={items}
                        onItemsChange={setItems}
                        facturacion={facturacionData}
                        onFacturacionChange={setFacturacionData}
                        recoleccionId={factura.id} // Habilita subida y envío
                        mostrarPagos={true}
                    />
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 sticky bottom-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleGuardar}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 transition"
                        disabled={loading}
                    >
                        <Save size={18} />
                        {loading ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ModalFacturacion;
