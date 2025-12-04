// admin_web/src/components/ModalReasignarFactura.jsx
import { useState, useEffect } from 'react';
import api from "../../services/api";

const ModalReasignarFactura = ({ factura, onClose, onSuccess }) => {
  // ✅ Todos los hooks DEBEN ir antes de cualquier return condicional
  const [loading, setLoading] = useState(false);
  const [accion, setAccion] = useState('pendiente'); // 'pendiente' o 'nueva_ruta'
  const [observaciones, setObservaciones] = useState('');
  const [rutaSeleccionada, setRutaSeleccionada] = useState('');
  const [rutasDisponibles, setRutasDisponibles] = useState([]);

  useEffect(() => {
    // Si la factura cambia y ya estaba en el modal, resetea la acción
    if (factura?.id) {
        setAccion('pendiente');
        setRutaSeleccionada('');
    }
  }, [factura?.id]);

  useEffect(() => {
    if (accion === 'nueva_ruta') {
      fetchRutasActivas();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accion]);

  // ✅ Cláusula de guardia DESPUÉS de todos los hooks
  if (!factura) return null;

  const fetchRutasActivas = async () => {
    try {
      const response = await api.get('/rutas/activas');
      // ✅ Usar response.data.data si el backend devuelve el objeto data anidado
      setRutasDisponibles(response.data.data || []);
    } catch (error) {
      console.error('Error al cargar rutas:', error);
    }
  };

  const handleSubmit = async () => {
    if (accion === 'nueva_ruta' && !rutaSeleccionada) {
      alert('Por favor selecciona una ruta');
      return;
    }

    try {
      setLoading(true);

      const payload = {
        facturaId: factura.id, 
        accion,
        observaciones,
        ...(accion === 'nueva_ruta' && { nuevaRutaId: rutaSeleccionada })
      };

      await api.post('/facturacion/reasignar', payload); 

      onSuccess(); // Disparar recarga en el componente padre

    } catch (error) {
      console.error('Error:', error);
      alert(error.response?.data?.error || 'Error al reasignar la factura');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-lg">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Reasignar Factura</h2>

          {/* Información de la factura */}
          <div className="bg-slate-100 p-4 rounded-lg mb-6">
            <h3 className="font-medium text-slate-700 mb-2">Información de la Factura</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Número/Tracking:</span>
                {/* ✅ CORRECCIÓN 2: Usar codigoTracking como principal y fallback a numeroFactura */}
                <span className="font-medium">{factura.codigoTracking || factura.numeroFactura || factura.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Cliente:</span>
                <span className="font-medium">{factura.cliente || factura.destinatario?.nombre || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Dirección:</span>
                <span className="font-medium text-right ml-4">{factura.direccion || factura.destinatario?.direccion}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Motivo no entrega:</span>
                <span className="font-medium text-rose-600">{factura.motivoNoEntrega || factura.reporteNoEntrega?.motivo || 'Sin especificar'}</span>
              </div>
            </div>
          </div>

          {/* Opciones de reasignación */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-3">
              ¿Qué deseas hacer con esta factura?
            </label>
            
            <div className="space-y-3">
              {/* Opción: Marcar como pendiente */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="accion"
                  value="pendiente"
                  checked={accion === 'pendiente'}
                  onChange={(e) => setAccion(e.target.value)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-medium text-slate-900">
                    Marcar como pendiente
                  </div>
                  <p className="text-sm text-slate-600">
                    La factura volverá al estado pendiente y podrá ser asignada a una nueva ruta más adelante
                  </p>
                </div>
              </label>

              {/* Opción: Asignar a nueva ruta */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="accion"
                  value="nueva_ruta"
                  checked={accion === 'nueva_ruta'}
                  onChange={(e) => setAccion(e.target.value)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-medium text-slate-900">
                    Asignar a otra ruta activa
                  </div>
                  <p className="text-sm text-slate-600">
                    Selecciona una ruta activa para reasignar esta factura inmediatamente
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Selección de ruta (si aplica) */}
          {accion === 'nueva_ruta' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Seleccionar ruta
              </label>
              <select
                value={rutaSeleccionada}
                onChange={(e) => setRutaSeleccionada(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={loading}
              >
                <option value="">-- Selecciona una ruta --</option>
                {rutasDisponibles.map((ruta) => (
                  <option key={ruta.id} value={ruta.id}>
                    {ruta.nombre} - {ruta.empleadoNombre} ({ruta.facturasEntregadas || 0}/{ruta.totalFacturas} entregadas)
                  </option>
                ))}
              </select>
              {rutasDisponibles.length === 0 && (
                <p className="text-sm text-slate-500 mt-1">
                  No hay rutas activas disponibles
                </p>
              )}
            </div>
          )}

          {/* Observaciones */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Observaciones (opcional)
            </label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Agregar notas o comentarios sobre la reasignación..."
              disabled={loading}
            />
          </div>

          {/* Botones */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:bg-slate-400"
              disabled={loading}
            >
              {loading ? 'Procesando...' : 'Confirmar Reasignación'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalReasignarFactura;