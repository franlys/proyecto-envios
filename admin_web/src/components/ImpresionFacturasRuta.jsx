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
      'pendiente': 'bg-yellow-100 text-yellow-800',
      'en_ruta': 'bg-blue-100 text-blue-800',
      'entregada': 'bg-green-100 text-green-800',
      'no_entregada': 'bg-red-100 text-red-800',
      'pagada': 'bg-green-100 text-green-800',
      'pendiente_pago': 'bg-yellow-100 text-yellow-800'
    };
    return colores[estado] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Cargando datos para impresión...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={handleCerrar}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  if (!datos) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">No hay datos disponibles</p>
      </div>
    );
  }

  const { ruta, company, facturas, stats } = datos;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Botones de acción - solo visible en pantalla */}
      <div className="no-print fixed top-4 right-4 flex gap-2 z-50">
        <button
          onClick={handleImprimir}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-lg"
        >
          <Printer size={20} />
          Imprimir
        </button>
        <button
          onClick={handleCerrar}
          className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition shadow-lg"
        >
          <X size={20} />
          Cerrar
        </button>
      </div>

      {/* Cada factura en su propia página */}
      {facturas.map((factura, index) => (
        <div key={factura.id} className="page-break max-w-[210mm] mx-auto bg-white shadow-lg print:shadow-none p-8 print:p-6 mb-8 print:mb-0">

          {/* Encabezado con logo - se repite en CADA factura */}
          <div className="mb-6 pb-4 border-b-2 border-gray-300">
            <div className="flex items-start justify-between">
              {/* Logo y nombre de empresa */}
              <div className="flex items-center gap-4">
                {company.logo ? (
                  <img
                    src={company.logo}
                    alt={company.nombre}
                    className="h-16 w-auto object-contain"
                  />
                ) : (
                  <div className="h-16 w-16 bg-blue-600 text-white flex items-center justify-center rounded-lg text-2xl font-bold">
                    {company.nombre?.charAt(0) || 'E'}
                  </div>
                )}
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">{company.nombre}</h1>
                  {company.telefono && <p className="text-sm text-gray-600">Tel: {company.telefono}</p>}
                  {company.email && <p className="text-sm text-gray-600">{company.email}</p>}
                  {company.direccion && <p className="text-xs text-gray-500 mt-1">{company.direccion}</p>}
                </div>
              </div>

              {/* Información de la ruta */}
              <div className="text-right">
                <h2 className="text-xl font-bold text-gray-800">HOJA DE ENTREGA</h2>
                <p className="text-sm text-gray-600">Fecha: {formatearFecha(new Date())}</p>
                <p className="text-sm font-semibold text-gray-700 mt-1">{ruta.nombre}</p>
                {ruta.zona && <p className="text-sm text-gray-600">Zona: {ruta.zona}</p>}
              </div>
            </div>
          </div>

          {/* Información del repartidor */}
          <div className="mb-4 p-3 bg-gray-50 rounded print:bg-gray-100">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-gray-700 text-sm">Repartidor</h3>
                {ruta.repartidor ? (
                  <>
                    <p className="text-sm text-gray-800">{ruta.repartidor.nombre}</p>
                    {ruta.repartidor.telefono && (
                      <p className="text-sm text-gray-600">Tel: {ruta.repartidor.telefono}</p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-500">No asignado</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-600">Factura</p>
                <p className="text-lg font-bold text-gray-800">#{index + 1} de {facturas.length}</p>
              </div>
            </div>
          </div>

          {/* Información de la factura */}
          <div className="border-2 border-gray-300 rounded-lg p-4 mb-4">
            <div className="flex items-start justify-between mb-3 pb-3 border-b-2 border-gray-200">
              <div>
                <h3 className="text-xl font-bold text-gray-800">{factura.codigoTracking}</h3>
                <p className="text-sm text-gray-600">Factura: {factura.numeroFactura}</p>
              </div>
              <div className="text-right">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getEstadoBadgeColor(factura.estado)}`}>
                  {factura.estado.replace('_', ' ').toUpperCase()}
                </span>
                {factura.pago && (
                  <p className="text-lg font-bold text-gray-800 mt-1">
                    {formatearMoneda(factura.pago.total)}
                  </p>
                )}
              </div>
            </div>

            {/* Información del remitente */}
            {factura.remitente && (
              <div className="mb-3 p-3 bg-green-50 rounded print:bg-green-100">
                <h4 className="font-semibold text-gray-700 text-sm mb-1">REMITENTE</h4>
                <p className="text-sm font-semibold text-gray-800">{factura.remitente.nombre}</p>
                {factura.remitente.telefono && (
                  <p className="text-sm text-gray-600">Tel: {factura.remitente.telefono}</p>
                )}
              </div>
            )}

            {/* Información del destinatario */}
            <div className="mb-4 p-3 bg-blue-50 rounded print:bg-blue-100">
              <h4 className="font-semibold text-gray-700 text-sm mb-1">DESTINATARIO</h4>
              <p className="text-base font-bold text-gray-800">{factura.destinatario.nombre}</p>
              <p className="text-sm text-gray-700 mt-1">{factura.destinatario.direccion}</p>
              {factura.destinatario.sector && (
                <p className="text-sm text-gray-600">Sector: {factura.destinatario.sector}</p>
              )}
              {factura.destinatario.ciudad && (
                <p className="text-sm text-gray-600">
                  {factura.destinatario.ciudad}{factura.destinatario.provincia && `, ${factura.destinatario.provincia}`}
                </p>
              )}
              {factura.destinatario.telefono && (
                <p className="text-sm font-semibold text-gray-800 mt-1">Tel: {factura.destinatario.telefono}</p>
              )}
            </div>

            {/* Items con checkboxes */}
            {factura.items && factura.items.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold text-gray-700 text-sm mb-3 pb-2 border-b border-gray-300">
                  ITEMS A ENTREGAR ({factura.items.length})
                </h4>
                <div className="space-y-2">
                  {factura.items.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-2 bg-gray-50 rounded print:bg-white print:border print:border-gray-300">
                      {/* Checkbox */}
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-5 h-5 border-2 border-gray-400 rounded print:border-black"></div>
                      </div>

                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-800">{item.descripcion}</p>
                            {item.cantidad > 1 && (
                              <p className="text-xs text-gray-600">Cantidad: {item.cantidad}</p>
                            )}
                            {item.peso && (
                              <p className="text-xs text-gray-600">Peso: {item.peso}</p>
                            )}
                          </div>
                          {item.entregado && (
                            <span className="text-green-600 font-semibold text-xs bg-green-100 px-2 py-1 rounded">
                              ✓ ENTREGADO
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Información de pago */}
            {factura.pago && (
              <div className="mb-4 p-3 bg-yellow-50 border-2 border-yellow-300 rounded print:bg-yellow-100">
                <h4 className="font-semibold text-gray-700 text-sm mb-2">INFORMACIÓN DE PAGO</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Monto Total:</span>
                    <span className="ml-2 font-bold text-gray-900 text-base">
                      {formatearMoneda(factura.pago.total)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Estado:</span>
                    <span className={`ml-2 font-semibold ${factura.pago.estado === 'pagada' ? 'text-green-600' : 'text-yellow-700'}`}>
                      {factura.pago.estado === 'pagada' ? '✓ PAGADO' : 'PENDIENTE'}
                    </span>
                  </div>
                  {factura.pago.montoPendiente > 0 && (
                    <div className="col-span-2 pt-2 border-t border-yellow-400">
                      <span className="text-gray-700 font-semibold">Monto a Cobrar:</span>
                      <span className="ml-2 font-bold text-red-600 text-lg">
                        {formatearMoneda(factura.pago.montoPendiente)}
                      </span>
                    </div>
                  )}
                  {factura.pago.metodoPago && (
                    <div className="col-span-2">
                      <span className="text-gray-600">Método de pago:</span>
                      <span className="ml-2 text-gray-800 font-medium">{factura.pago.metodoPago}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notas */}
            {(factura.notas || factura.notasInternas) && (
              <div className="mb-4 p-3 bg-orange-50 border-l-4 border-orange-400 rounded print:bg-orange-100">
                <h4 className="font-semibold text-gray-700 text-sm mb-1">⚠️ NOTAS IMPORTANTES</h4>
                {factura.notas && (
                  <p className="text-sm text-gray-800 mb-1">{factura.notas}</p>
                )}
                {factura.notasInternas && (
                  <p className="text-xs text-gray-600 italic">{factura.notasInternas}</p>
                )}
              </div>
            )}
          </div>

          {/* Área de firma y confirmación */}
          <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50 print:bg-white">
            <h4 className="font-semibold text-gray-700 text-sm mb-3">CONFIRMACIÓN DE ENTREGA</h4>
            <div className="grid grid-cols-2 gap-6 mb-4">
              <div>
                <p className="text-xs text-gray-600 mb-2 font-semibold">Nombre de quien recibe:</p>
                <div className="border-b-2 border-gray-400 h-10"></div>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-2 font-semibold">Cédula / Identificación:</p>
                <div className="border-b-2 border-gray-400 h-10"></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-gray-600 mb-2 font-semibold">Firma del cliente:</p>
                <div className="border-2 border-gray-400 h-20 rounded"></div>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-2 font-semibold">Hora de entrega:</p>
                <div className="border-b-2 border-gray-400 h-10 mt-2"></div>
                <p className="text-xs text-gray-500 mt-4">Fecha: {formatearFecha(new Date())}</p>
              </div>
            </div>
          </div>

          {/* Pie de página */}
          <div className="mt-6 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
            <p>{company.nombre} - Sistema de Gestión de Envíos</p>
            <p className="mt-1">Documento generado el {formatearFecha(new Date())}</p>
          </div>
        </div>
      ))}

      {/* Estilos para impresión */}
      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
          }

          .no-print {
            display: none !important;
          }

          @page {
            size: letter;
            margin: 1cm;
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

          .print\\:bg-gray-100 {
            background-color: #f3f4f6 !important;
          }

          .print\\:bg-blue-100 {
            background-color: #dbeafe !important;
          }

          .print\\:bg-green-100 {
            background-color: #dcfce7 !important;
          }

          .print\\:bg-yellow-100 {
            background-color: #fef3c7 !important;
          }

          .print\\:bg-orange-100 {
            background-color: #ffedd5 !important;
          }

          .print\\:bg-white {
            background-color: white !important;
          }

          .print\\:border {
            border-width: 1px !important;
          }

          .print\\:border-gray-300 {
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
