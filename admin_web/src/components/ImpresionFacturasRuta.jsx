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

const ImpresionFacturasRuta = () => {
  const { rutaId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [datos, setDatos] = useState(null);

  useEffect(() => {
    cargarDatosImpresion();
  }, [rutaId]);

  const cargarDatosImpresion = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/repartidores/rutas/${rutaId}/exportar-impresion`);

      if (response.data.success) {
        console.log('📄 Datos de impresión recibidos:', response.data.data);
        console.log('🏢 Información de compañía:', response.data.data.company);
        setDatos(response.data.data);
      } else {
        setError('No se pudieron cargar los datos');
      }
    } catch (err) {
      console.error('Error cargando datos para impresión:', err);
      setError(err.response?.data?.message || 'Error al cargar los datos');
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

      {/* Contenido para impresión */}
      <div className="max-w-[210mm] mx-auto bg-white shadow-lg print:shadow-none p-8 print:p-0">

        {/* Encabezado con logo - se repite en cada página */}
        <div className="print:block">
          <div className="flex items-start justify-between mb-6 pb-4 border-b-2 border-gray-300">
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
              </div>
            </div>

            {/* Información de la ruta */}
            <div className="text-right">
              <h2 className="text-xl font-bold text-gray-800">HOJA DE RUTA</h2>
              <p className="text-sm text-gray-600">Fecha: {formatearFecha(new Date())}</p>
              <p className="text-sm font-semibold text-gray-700 mt-1">{ruta.nombre}</p>
              {ruta.zona && <p className="text-sm text-gray-600">Zona: {ruta.zona}</p>}
            </div>
          </div>

          {/* Información del repartidor y resumen */}
          <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg print:bg-gray-100">
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Repartidor</h3>
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
              {ruta.vehiculo && (
                <p className="text-sm text-gray-600 mt-1">Vehículo: {ruta.vehiculo}</p>
              )}
            </div>

            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Resumen</h3>
              <div className="space-y-1 text-sm">
                <p className="text-gray-800">Total facturas: <span className="font-semibold">{stats.totalFacturas}</span></p>
                <p className="text-gray-800">Total items: <span className="font-semibold">{stats.totalItems}</span></p>
                <p className="text-gray-800">Monto total: <span className="font-semibold">{formatearMoneda(stats.montoTotal)}</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* Lista de facturas */}
        <div className="space-y-6">
          {facturas.map((factura, index) => (
            <div
              key={factura.id}
              className="border-2 border-gray-300 rounded-lg p-4 print:break-inside-avoid print:page-break-inside-avoid"
            >
              {/* Encabezado de factura */}
              <div className="flex items-start justify-between mb-3 pb-2 border-b border-gray-200">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">
                    #{index + 1} - {factura.codigoTracking}
                  </h3>
                  <p className="text-sm text-gray-600">Factura: {factura.numeroFactura}</p>
                </div>
                <div className="text-right">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getEstadoBadgeColor(factura.estado)}`}>
                    {factura.estado.replace('_', ' ').toUpperCase()}
                  </span>
                  {factura.pago && (
                    <p className="text-sm font-semibold text-gray-700 mt-1">
                      {formatearMoneda(factura.pago.total)}
                    </p>
                  )}
                </div>
              </div>

              {/* Información del destinatario */}
              <div className="mb-3 bg-blue-50 p-3 rounded print:bg-blue-100">
                <h4 className="font-semibold text-gray-700 text-sm mb-1">DESTINATARIO</h4>
                <p className="text-sm font-semibold text-gray-800">{factura.destinatario.nombre}</p>
                <p className="text-sm text-gray-700">{factura.destinatario.direccion}</p>
                {factura.destinatario.sector && (
                  <p className="text-sm text-gray-600">Sector: {factura.destinatario.sector}</p>
                )}
                {factura.destinatario.telefono && (
                  <p className="text-sm text-gray-600">Tel: {factura.destinatario.telefono}</p>
                )}
              </div>

              {/* Items */}
              {factura.items && factura.items.length > 0 && (
                <div className="mb-3">
                  <h4 className="font-semibold text-gray-700 text-sm mb-2">ITEMS ({factura.items.length})</h4>
                  <div className="space-y-1">
                    {factura.items.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm">
                        <span className="text-gray-500 min-w-[20px]">{idx + 1}.</span>
                        <div className="flex-1">
                          <span className="text-gray-700">{item.descripcion}</span>
                          {item.cantidad > 1 && (
                            <span className="text-gray-500 ml-2">(x{item.cantidad})</span>
                          )}
                        </div>
                        {item.entregado && (
                          <span className="text-green-600 font-semibold text-xs">✓ ENTREGADO</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Información de pago */}
              {factura.pago && (
                <div className="mb-3 p-2 bg-yellow-50 rounded print:bg-yellow-100">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">Estado pago:</span>
                      <span className={`ml-2 font-semibold ${factura.pago.estado === 'pagada' ? 'text-green-600' : 'text-yellow-600'}`}>
                        {factura.pago.estado === 'pagada' ? '✓ PAGADO' : 'PENDIENTE'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Monto pendiente:</span>
                      <span className="ml-2 font-semibold text-gray-800">
                        {formatearMoneda(factura.pago.montoPendiente)}
                      </span>
                    </div>
                    {factura.pago.metodoPago && (
                      <div className="col-span-2">
                        <span className="text-gray-600">Método:</span>
                        <span className="ml-2 text-gray-800">{factura.pago.metodoPago}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notas */}
              {factura.notas && (
                <div className="p-2 bg-gray-50 rounded print:bg-gray-100">
                  <p className="text-xs text-gray-600">
                    <span className="font-semibold">Notas:</span> {factura.notas}
                  </p>
                </div>
              )}

              {/* Área de firma */}
              <div className="mt-4 pt-3 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Firma del cliente:</p>
                    <div className="border-b border-gray-400 h-12"></div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Hora de entrega:</p>
                    <div className="border-b border-gray-400 h-12"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pie de página */}
        <div className="mt-8 pt-4 border-t-2 border-gray-300 text-center text-sm text-gray-600">
          <p>Documento generado el {formatearFecha(new Date())}</p>
          <p className="mt-1">{company.nombre} - Sistema de Gestión de Envíos</p>
        </div>
      </div>

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

          /* Asegurar que el contenido no se corte */
          * {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
};

export default ImpresionFacturasRuta;
