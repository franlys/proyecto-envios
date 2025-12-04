// admin_web/src/components/ImpresionFacturasRuta.jsx
/**
 * COMPONENTE DE IMPRESIÓN DE FACTURAS DE RUTA
 * Muestra todas las facturas de una ruta con formato profesional para impresión
 * Incluye logo de empresa, detalles completos y diseño optimizado para papel
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, X, Loader, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { auth } from '../services/firebase';

const ImpresionFacturasRuta = () => {
  const { rutaId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [datos, setDatos] = useState(null);

  useEffect(() => {
    // Esperar a que Firebase Auth esté listo antes de cargar datos
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        console.log('✅ Usuario autenticado, cargando datos de impresión...');
        cargarDatosImpresion();
      } else {
        console.error('❌ No hay usuario autenticado para imprimir');
        setError('Debes estar autenticado para imprimir. Por favor, inicia sesión.');
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [rutaId]);

  const cargarDatosImpresion = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log(`🖨️ Solicitando datos de impresión para ruta ${rutaId}...`);
      const response = await api.get(`/repartidores/rutas/${rutaId}/exportar-impresion`);

      if (response.data.success) {
        console.log('📄 Datos de impresión recibidos:', response.data.data);
        console.log('🏢 Información de compañía:', response.data.data.company);
        setDatos(response.data.data);
      } else {
        setError('No se pudieron cargar los datos');
      }
    } catch (err) {
      console.error('❌ Error cargando datos para impresión:', err);
      setError(err.response?.data?.message || 'Error al cargar los datos. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleImprimir = () => {
    window.print();
  };

  const handleCerrar = () => {
    navigate(-1);
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return '-';
    const date = fecha instanceof Date ? fecha : new Date(fecha);
    return date.toLocaleDateString('es-DO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatearMoneda = (monto) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP'
    }).format(monto || 0);
  };

  const getEstadoBadgeColor = (estado) => {
    const colores = {
      'pendiente': 'bg-amber-100 text-amber-800',
      'en_ruta': 'bg-indigo-100 text-indigo-800',
      'entregada': 'bg-emerald-100 text-emerald-800',
      'no_entregada': 'bg-rose-100 text-rose-800',
      'pagada': 'bg-emerald-100 text-emerald-800',
      'pendiente_pago': 'bg-amber-100 text-amber-800'
    };
    return colores[estado] || 'bg-slate-100 text-slate-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Cargando datos para impresión...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Error</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <button
            onClick={handleCerrar}
            className="px-6 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  if (!datos) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-600">No hay datos disponibles</p>
      </div>
    );
  }

  const { ruta, company, facturas, stats } = datos;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Botones de acción - solo visible en pantalla */}
      <div className="no-print fixed top-4 right-4 flex gap-2 z-50">
        <button
          onClick={handleImprimir}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-lg"
        >
          <Printer size={20} />
          Imprimir
        </button>
        <button
          onClick={handleCerrar}
          className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition shadow-lg"
        >
          <X size={20} />
          Cerrar
        </button>
      </div>

      {/* Cada factura en su propia página - Formato A4 */}
      {facturas.map((factura, index) => (
        <div key={factura.id} className="page-break w-[210mm] h-[297mm] mx-auto bg-white shadow-lg print:shadow-none p-6 print:p-4 mb-8 print:mb-0 overflow-hidden">

          {/* Encabezado con logo - se repite en CADA factura - Optimizado A4 */}
          <div className="mb-4 pb-3 border-b-2 border-slate-300">
            <div className="flex items-start justify-between">
              {/* Logo y nombre de empresa */}
              <div className="flex items-center gap-3">
                {company.logo ? (
                  <img
                    src={company.logo}
                    alt={company.nombre}
                    className="h-12 w-auto object-contain"
                  />
                ) : (
                  <div className="h-12 w-12 bg-indigo-600 text-white flex items-center justify-center rounded-lg text-xl font-bold">
                    {company.nombre?.charAt(0) || 'E'}
                  </div>
                )}
                <div>
                  <h1 className="text-xl font-bold text-slate-800">{company.nombre}</h1>
                  <div className="flex gap-3 text-xs text-slate-600">
                    {company.telefono && <span>Tel: {company.telefono}</span>}
                    {company.email && <span>{company.email}</span>}
                  </div>
                </div>
              </div>

              {/* Información de la ruta */}
              <div className="text-right">
                <h2 className="text-lg font-bold text-slate-800">HOJA DE ENTREGA</h2>
                <p className="text-xs text-slate-600">Fecha: {formatearFecha(new Date())}</p>
                <p className="text-sm font-semibold text-slate-700">{ruta.nombre}</p>
                {ruta.zona && <p className="text-xs text-slate-600">Zona: {ruta.zona}</p>}
              </div>
            </div>
          </div>

          {/* Información del repartidor - Compacta */}
          <div className="mb-3 p-2 bg-slate-50 rounded print:bg-slate-100 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-xs text-slate-600">Repartidor: </span>
                <span className="text-sm font-semibold text-slate-800">
                  {ruta.repartidor?.nombre || 'No asignado'}
                </span>
                {ruta.repartidor?.telefono && (
                  <span className="text-xs text-slate-600 ml-2">Tel: {ruta.repartidor.telefono}</span>
                )}
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-600">Factura </span>
              <span className="text-base font-bold text-slate-800">#{index + 1}/{facturas.length}</span>
            </div>
          </div>

          {/* Información de la factura - Optimizada A4 */}
          <div className="border-2 border-slate-300 rounded-lg p-3 mb-3">
            <div className="flex items-start justify-between mb-2 pb-2 border-b border-slate-200">
              <div>
                <h3 className="text-lg font-bold text-slate-800">{factura.codigoTracking}</h3>
                <p className="text-xs text-slate-600">Factura: {factura.numeroFactura}</p>
              </div>
              <div className="text-right">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${getEstadoBadgeColor(factura.estado)}`}>
                  {factura.estado.replace('_', ' ').toUpperCase()}
                </span>
                {factura.pago && (
                  <p className="text-base font-bold text-slate-800 mt-1">
                    {formatearMoneda(factura.pago.total)}
                  </p>
                )}
              </div>
            </div>

            {/* Información del remitente y destinatario en grid */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              {/* Remitente */}
              {factura.remitente && (
                <div className="p-2 bg-emerald-50 rounded print:bg-emerald-100">
                  <h4 className="font-semibold text-slate-700 text-xs mb-1">REMITENTE</h4>
                  <p className="text-xs font-semibold text-slate-800">{factura.remitente.nombre}</p>
                  {factura.remitente.telefono && (
                    <p className="text-xs text-slate-600">Tel: {factura.remitente.telefono}</p>
                  )}
                </div>
              )}

              {/* Destinatario */}
              <div className={`p-2 bg-indigo-50 rounded print:bg-indigo-100 ${!factura.remitente ? 'col-span-2' : ''}`}>
                <h4 className="font-semibold text-slate-700 text-xs mb-1">DESTINATARIO</h4>
                <p className="text-sm font-bold text-slate-800">{factura.destinatario.nombre}</p>
                <p className="text-xs text-slate-700">{factura.destinatario.direccion}</p>
                <div className="flex gap-2 text-xs text-slate-600 mt-1">
                  {factura.destinatario.sector && <span>Sector: {factura.destinatario.sector}</span>}
                  {factura.destinatario.telefono && <span>Tel: {factura.destinatario.telefono}</span>}
                </div>
              </div>
            </div>

            {/* Items con checkboxes - Compactos */}
            {factura.items && factura.items.length > 0 && (
              <div className="mb-3">
                <h4 className="font-semibold text-slate-700 text-xs mb-2 pb-1 border-b border-slate-300">
                  ITEMS A ENTREGAR ({factura.items.length})
                </h4>
                <div className="space-y-1.5">
                  {factura.items.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-1.5 bg-slate-50 rounded print:bg-white print:border print:border-slate-300">
                      {/* Checkbox */}
                      <div className="flex-shrink-0 mt-0.5">
                        <div className="w-4 h-4 border-2 border-slate-400 rounded print:border-black"></div>
                      </div>

                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-slate-800 leading-tight">{item.descripcion}</p>
                            <div className="flex gap-2 text-xs text-slate-600">
                              {item.cantidad > 1 && <span>Cant: {item.cantidad}</span>}
                              {item.peso && <span>Peso: {item.peso}</span>}
                            </div>
                          </div>
                          {item.entregado && (
                            <span className="text-emerald-600 font-semibold text-xs bg-emerald-100 px-1.5 py-0.5 rounded">
                              ✓
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Información de pago - Compacta */}
            {factura.pago && (
              <div className="mb-2 p-2 bg-amber-50 border border-amber-300 rounded print:bg-amber-100">
                <h4 className="font-semibold text-slate-700 text-xs mb-1">INFORMACIÓN DE PAGO</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-600">Monto Total: </span>
                    <span className="font-bold text-slate-900">
                      {formatearMoneda(factura.pago.total)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-600">Estado: </span>
                    <span className={`font-semibold ${factura.pago.estado === 'pagada' ? 'text-emerald-600' : 'text-amber-700'}`}>
                      {factura.pago.estado === 'pagada' ? '✓ PAGADO' : 'PENDIENTE'}
                    </span>
                  </div>
                  {factura.pago.montoPendiente > 0 && (
                    <div className="col-span-2 pt-1 border-t border-amber-400">
                      <span className="text-slate-700 font-semibold">Monto a Cobrar: </span>
                      <span className="font-bold text-rose-600 text-sm">
                        {formatearMoneda(factura.pago.montoPendiente)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notas - Compactas */}
            {(factura.notas || factura.notasInternas) && (
              <div className="mb-2 p-2 bg-amber-50 border-l-2 border-amber-400 rounded print:bg-amber-100">
                <h4 className="font-semibold text-slate-700 text-xs mb-0.5">⚠️ NOTAS</h4>
                {factura.notas && (
                  <p className="text-xs text-slate-800">{factura.notas}</p>
                )}
                {factura.notasInternas && (
                  <p className="text-xs text-slate-600 italic">{factura.notasInternas}</p>
                )}
              </div>
            )}
          </div>

          {/* Área de firma y confirmación - Compacta */}
          <div className="border-2 border-slate-300 rounded-lg p-3 bg-slate-50 print:bg-white">
            <h4 className="font-semibold text-slate-700 text-xs mb-2">CONFIRMACIÓN DE ENTREGA</h4>
            <div className="grid grid-cols-2 gap-3 mb-2">
              <div>
                <p className="text-xs text-slate-600 mb-1">Nombre de quien recibe:</p>
                <div className="border-b-2 border-slate-400 h-8"></div>
              </div>
              <div>
                <p className="text-xs text-slate-600 mb-1">Cédula / ID:</p>
                <div className="border-b-2 border-slate-400 h-8"></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-slate-600 mb-1">Firma del cliente:</p>
                <div className="border-2 border-slate-400 h-16 rounded"></div>
              </div>
              <div>
                <p className="text-xs text-slate-600 mb-1">Hora de entrega:</p>
                <div className="border-b-2 border-slate-400 h-8 mt-1"></div>
                <p className="text-xs text-slate-500 mt-2">Fecha: {formatearFecha(new Date())}</p>
              </div>
            </div>
          </div>

          {/* Pie de página - Compacto */}
          <div className="absolute bottom-4 left-6 right-6 pt-2 border-t border-slate-300 text-center text-xs text-slate-500">
            <p>{company.nombre} - Sistema de Gestión de Envíos</p>
          </div>
        </div>
      ))}

      {/* Estilos para impresión - Formato A4 */}
      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
          }

          .no-print {
            display: none !important;
          }

          /* Configuración para papel A4 (210mm x 297mm) */
          @page {
            size: A4;
            margin: 0;
          }

          .print\\:break-inside-avoid {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .print\\:page-break-inside-avoid {
            page-break-inside: avoid;
          }

          /* Cada factura en su propia página */
          .page-break {
            page-break-after: always;
            break-after: page;
          }

          .page-break:last-child {
            page-break-after: avoid;
            break-after: avoid;
          }

          /* Estilos específicos para impresión */
          .print\\:shadow-none {
            box-shadow: none !important;
          }

          .print\\:p-6 {
            padding: 1.5rem !important;
          }

          .print\\:mb-0 {
            margin-bottom: 0 !important;
          }

          .print\\:bg-slate-100 {
            background-color: #f3f4f6 !important;
          }

          .print\\:bg-indigo-100 {
            background-color: #dbeafe !important;
          }

          .print\\:bg-emerald-100 {
            background-color: #dcfce7 !important;
          }

          .print\\:bg-amber-100 {
            background-color: #fef3c7 !important;
          }

          .print\\:bg-amber-100 {
            background-color: #ffedd5 !important;
          }

          .print\\:bg-white {
            background-color: white !important;
          }

          .print\\:border {
            border-width: 1px !important;
          }

          .print\\:border-slate-300 {
            border-color: #d1d5db !important;
          }

          .print\\:border-black {
            border: 2px solid black !important;
          }

          /* Asegurar que el contenido no se corte */
          * {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }

        /* Estilos para pantalla */
        @media screen {
          .page-break {
            margin-bottom: 2rem;
          }
        }
      `}</style>
    </div>
  );
};

export default ImpresionFacturasRuta;
