import { useState } from 'react';
import ModuloFacturacion from '../ModuloFacturacion';
import { X, Save } from 'lucide-react';
import api from '../../services/api'; // Asumiendo que existe api service, si no usar fetch

const ModalFacturacion = ({ factura, onClose, onUpdate }) => {
    const [loading, setLoading] = useState(false);
    const [facturacionData, setFacturacionData] = useState(factura.facturacion || {});
    const [items, setItems] = useState(factura.items || []);

    const handleGuardar = async () => {
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
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        Gestionar Factura - {factura.codigoTracking || factura.id}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
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
                <div className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 sticky bottom-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleGuardar}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition"
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
