// admin_web/src/components/modals/ModalDetalleFactura.jsx
// ✅ INTEGRACIÓN DEL CAMPO SECTOR

import { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';

const ModalDetalleFactura = ({ factura, onClose }) => {
  const [rutaInfo, setRutaInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRutaInfo = async () => {
      if (!factura?.rutaId) {
        setLoading(false);
        return;
      }

      try {
        const rutaDoc = await getDoc(doc(db, 'rutas', factura.rutaId));
        
        if (rutaDoc.exists()) {
          const rutaData = rutaDoc.data();
          let empleadoNombre = 'No asignado';

          if (rutaData.empleadoNombre) {
            empleadoNombre = rutaData.empleadoNombre;
          } 
          else if (rutaData.empleadoId) {
            try {
              const empleadoDoc = await getDoc(doc(db, 'usuarios', rutaData.empleadoId));
              if (empleadoDoc.exists()) {
                const empleadoData = empleadoDoc.data();
                empleadoNombre = empleadoData.nombre || empleadoData.email || 'Sin nombre';
              }
            } catch (error) {
              console.error('Error al buscar empleado:', error);
            }
          }

          setRutaInfo({
            nombre: rutaData.nombre,
            repartidorNombre: empleadoNombre
          });
        }
      } catch (error) {
        console.error('Error al obtener info de ruta:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRutaInfo();
  }, [factura]);

  if (!factura) return null;

  const handleCall = () => {
    if (factura.telefono) {
      window.location.href = 'tel:' + factura.telefono;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-6 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Detalles de Factura</h2>
              <p className="text-indigo-100 mt-1">Información completa para contacto</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-indigo-200 transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="bg-slate-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-500">Número de Factura</label>
                <p className="text-lg font-bold text-slate-900 mt-1">{factura.numeroFactura}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-500">Estado</label>
                <p className="mt-1">
                  <span className={'px-3 py-1 rounded-full text-sm font-medium ' + (
                    factura.estado === 'entregado' ? 'bg-emerald-100 text-emerald-800' :
                    factura.estado === 'no_entregado' ? 'bg-rose-100 text-rose-800' :
                    factura.estado === 'asignado' ? 'bg-indigo-100 text-indigo-800' :
                    'bg-slate-100 text-slate-800'
                  )}>
                    {factura.estado === 'entregado' ? 'Entregado' :
                     factura.estado === 'no_entregado' ? 'No Entregado' :
                     factura.estado === 'asignado' ? 'Asignado' :
                     'Pendiente'}
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Información del Cliente
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <label className="text-sm font-medium text-slate-500">Nombre Completo</label>
                  <p className="text-slate-900 font-medium">{factura.cliente}</p>
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(factura.cliente)}
                  className="text-indigo-600 hover:text-indigo-800 text-sm"
                >
                  Copiar
                </button>
              </div>

              {factura.telefono && (
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <label className="text-sm font-medium text-slate-500">Teléfono</label>
                    <p className="text-slate-900 font-medium">{factura.telefono}</p>
                  </div>
                  <button
                    onClick={handleCall}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition text-sm font-medium"
                  >
                    Llamar
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex-1">
                  <label className="text-sm font-medium text-slate-500">Dirección</label>
                  <p className="text-slate-900">{factura.direccion}</p>
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(factura.direccion)}
                  className="text-indigo-600 hover:text-indigo-800 text-sm ml-2"
                >
                  Copiar
                </button>
              </div>

              {/* ✅ NUEVO: Campo Sector */}
              {factura.sector && (
                <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-indigo-700">Sector</label>
                    <p className="text-indigo-900 font-medium">{factura.sector}</p>
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(factura.sector)}
                    className="text-indigo-600 hover:text-indigo-800 text-sm ml-2"
                  >
                    Copiar
                  </button>
                </div>
              )}
            </div>
          </div>

          {factura.estado === 'no_entregado' && (
            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Detalles del Intento Fallido
              </h3>
              <div className="space-y-3">
                <div className="p-3 bg-rose-50 rounded-lg border border-rose-200">
                  <label className="text-sm font-medium text-rose-700">Motivo de No Entrega</label>
                  <p className="text-rose-900 font-medium mt-1">
                    {factura.motivoNoEntrega || 'Sin motivo especificado'}
                  </p>
                </div>

                {factura.fechaIntento && (
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <label className="text-sm font-medium text-slate-500">Fecha del Intento</label>
                    <p className="text-slate-900">
                      {new Date(factura.fechaIntento).toLocaleString()}
                    </p>
                  </div>
                )}

                {factura.observaciones && (
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <label className="text-sm font-medium text-slate-500">Observaciones</label>
                    <p className="text-slate-900 mt-1">{factura.observaciones}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {factura.rutaId && (
            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                Información de Ruta
              </h3>
              
              {loading ? (
                <div className="p-4 bg-slate-50 rounded-lg text-center text-slate-500">
                  Cargando información de ruta...
                </div>
              ) : rutaInfo ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <label className="text-sm font-medium text-slate-500">Ruta</label>
                    <p className="text-slate-900 font-medium">{rutaInfo.nombre}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <label className="text-sm font-medium text-slate-500">Repartidor</label>
                    <p className="text-slate-900 font-medium">{rutaInfo.repartidorNombre}</p>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-amber-800 text-sm">No se pudo cargar la información de la ruta</p>
                </div>
              )}
            </div>
          )}

          {factura.monto && (
            <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
              <label className="text-sm font-medium text-indigo-700">Monto a Cobrar</label>
              <p className="text-2xl font-bold text-indigo-900 mt-1">
                ${factura.monto.toLocaleString()}
              </p>
            </div>
          )}
        </div>

        <div className="bg-slate-50 px-6 py-4 rounded-b-lg flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalDetalleFactura;