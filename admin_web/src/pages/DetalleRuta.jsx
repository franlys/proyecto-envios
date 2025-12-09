// admin_web/src/pages/DetalleRuta.jsx
// ✅ INTEGRACIÓN COMPLETA DEL CAMPO SECTOR

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Image, X } from 'lucide-react';
import api from '../services/api';

const DetalleRuta = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ruta, setRuta] = useState(null);
  const [facturas, setFacturas] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRutaCompleta();
  }, [id]);

  const fetchRutaCompleta = async () => {
    try {
      const response = await api.get(`/rutas/${id}`);
      
      if (response.data.success) {
        const rutaData = response.data.data;
        
        setRuta(rutaData);
        setFacturas(rutaData.facturas || []);
        setGastos(rutaData.gastos || []);
      } else {
        throw new Error(response.data.error || 'Error al cargar la ruta');
      }

    } catch (error) {
      console.error('Error al cargar ruta:', error);
      if (error.response?.status === 404) {
        alert('Ruta no encontrada');
        navigate('/rutas');
      } else if (error.response?.status === 403) {
        alert('No tienes permisos para ver esta ruta');
        navigate('/rutas');
      } else {
        alert('Error al cargar la ruta');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Cargando detalles de la ruta...</p>
        </div>
      </div>
    );
  }

  if (!ruta) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-xl text-slate-600">Ruta no encontrada</p>
          <button
            onClick={() => navigate('/rutas')}
            className="mt-4 text-indigo-600 hover:text-indigo-800"
          >
            Volver a Rutas
          </button>
        </div>
      </div>
    );
  }

  const facturasEntregadas = facturas.filter(f => f.estado === 'entregado' || f.estado === 'entregada').length;
  const facturasNoEntregadas = facturas.filter(f => f.estado === 'no_entregado' || f.estado === 'no_entregada').length;
  const facturasPendientes = facturas.filter(f =>
    f.estado === 'asignado' || f.estado === 'pendiente' || f.estado === 'confirmada'
  ).length;

  const totalGastos = gastos.reduce((sum, g) => sum + (g.monto || 0), 0);
  const totalCobrado = facturas
    .filter(f => f.estado === 'entregado' || f.estado === 'entregada')
    .reduce((sum, f) => sum + (f.monto || 0), 0);
  
  const balance = (ruta.montoAsignado || 0) - totalGastos;

  const getEstadoBadge = (estado) => {
    const badges = {
      'pendiente': 'bg-amber-100 text-amber-800',
      'en_proceso': 'bg-indigo-100 text-indigo-800',
      'completada': 'bg-emerald-100 text-emerald-800',
      'cancelada': 'bg-rose-100 text-rose-800'
    };
    
    const labels = {
      'pendiente': 'Pendiente',
      'en_proceso': 'En Proceso',
      'completada': 'Completada',
      'cancelada': 'Cancelada'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${badges[estado] || 'bg-slate-100 text-slate-800'}`}>
        {labels[estado] || estado}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/rutas')}
          className="flex items-center text-slate-600 hover:text-slate-800 mb-4"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver a Rutas
        </button>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{ruta.nombre}</h1>
              <p className="text-slate-600 mt-1">
                Creada el {new Date(ruta.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              {getEstadoBadge(ruta.estado)}
            </div>
          </div>
        </div>
      </div>

      {/* Información del Repartidor */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
          <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Repartidor Asignado
        </h2>
        
        {ruta.empleadoNombre ? (
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-500">Nombre</label>
              <p className="text-slate-900 font-medium">{ruta.empleadoNombre}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-500">Email</label>
              <p className="text-slate-900">{ruta.empleadoEmail || 'No disponible'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-500">Teléfono</label>
              <p className="text-slate-900">{ruta.empleadoTelefono || 'No disponible'}</p>
            </div>
          </div>
        ) : (
          <p className="text-slate-500">No hay repartidor asignado</p>
        )}
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Facturas</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{facturas.length}</p>
            </div>
            <div className="p-3 bg-indigo-100 rounded-full">
              <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Entregadas</p>
              <p className="text-3xl font-bold text-emerald-600 mt-1">{facturasEntregadas}</p>
            </div>
            <div className="p-3 bg-emerald-100 rounded-full">
              <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">No Entregadas</p>
              <p className="text-3xl font-bold text-rose-600 mt-1">{facturasNoEntregadas}</p>
            </div>
            <div className="p-3 bg-rose-100 rounded-full">
              <svg className="w-8 h-8 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Pendientes</p>
              <p className="text-3xl font-bold text-amber-600 mt-1">{facturasPendientes}</p>
            </div>
            <div className="p-3 bg-amber-100 rounded-full">
              <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Resumen Financiero */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
          <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Resumen Financiero
        </h2>

        <div className="grid grid-cols-4 gap-4">
          <div className="p-4 bg-indigo-50 rounded-lg">
            <label className="text-sm font-medium text-indigo-700">Monto Asignado</label>
            <p className="text-2xl font-bold text-indigo-900 mt-1">
              ${(ruta.montoAsignado || 0).toLocaleString()}
            </p>
          </div>

          <div className="p-4 bg-emerald-50 rounded-lg">
            <label className="text-sm font-medium text-emerald-700">Total Cobrado</label>
            <p className="text-2xl font-bold text-emerald-900 mt-1">
              ${totalCobrado.toLocaleString()}
            </p>
          </div>

          <div className="p-4 bg-rose-50 rounded-lg">
            <label className="text-sm font-medium text-rose-700">Total Gastos</label>
            <p className="text-2xl font-bold text-rose-900 mt-1">
              ${totalGastos.toLocaleString()}
            </p>
          </div>

          <div className="p-4 bg-purple-50 rounded-lg">
            <label className="text-sm font-medium text-purple-700">Balance</label>
            <p className={`text-2xl font-bold mt-1 ${balance >= 0 ? 'text-purple-900' : 'text-rose-600'}`}>
              ${balance.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs: Facturas y Gastos */}
      <div className="bg-white rounded-lg shadow-md">
        <TabsDetalleRuta facturas={facturas} gastos={gastos} />
      </div>
    </div>
  );
};

// Componente de Tabs
const TabsDetalleRuta = ({ facturas, gastos }) => {
  const [activeTab, setActiveTab] = useState('facturas');

  return (
    <>
      <div className="border-b border-slate-200">
        <nav className="flex gap-4 px-6">
          <button
            onClick={() => setActiveTab('facturas')}
            className={`py-4 px-2 border-b-2 font-medium transition ${
              activeTab === 'facturas'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Facturas ({facturas.length})
          </button>
          <button
            onClick={() => setActiveTab('gastos')}
            className={`py-4 px-2 border-b-2 font-medium transition ${
              activeTab === 'gastos'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Gastos ({gastos.length})
          </button>
        </nav>
      </div>

      <div className="p-6">
        {activeTab === 'facturas' ? (
          <TablaFacturas facturas={facturas} />
        ) : (
          <TablaGastos gastos={gastos} />
        )}
      </div>
    </>
  );
};

// ✅ TABLA DE FACTURAS CON CORRECCIÓN DEL WARNING "KEY" (ya incluida)
const TablaFacturas = ({ facturas }) => {
  const [modalFoto, setModalFoto] = useState(null);

  if (facturas.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-slate-500">No hay facturas en esta ruta</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-slate-50">
            <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Número</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Cliente</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Dirección</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Sector</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Monto</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Estado</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Fotos</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Observaciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {facturas.map((factura) => (
            <tr key={factura.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 text-sm font-medium text-slate-900">{factura.codigoTracking || factura.numeroFactura || '-'}</td>
              <td className="px-4 py-3 text-sm text-slate-700">{factura.cliente}</td>
              <td className="px-4 py-3 text-sm text-slate-600">{factura.direccion}</td>
              {/* ✅ NUEVA COLUMNA: Sector */}
              <td className="px-4 py-3 text-sm text-indigo-600 font-medium">
                {factura.sector || '-'}
              </td>
              <td className="px-4 py-3 text-sm font-medium text-slate-900">
                ${(factura.monto || 0).toLocaleString()}
              </td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  factura.estado === 'entregado' || factura.estado === 'entregada' ? 'bg-emerald-100 text-emerald-800' :
                  factura.estado === 'no_entregado' || factura.estado === 'no_entregada' ? 'bg-rose-100 text-rose-800' :
                  'bg-amber-100 text-amber-800'
                }`}>
                  {factura.estado === 'entregado' || factura.estado === 'entregada' ? 'Entregado' :
                   factura.estado === 'no_entregado' || factura.estado === 'no_entregada' ? 'No Entregado' :
                   'Pendiente'}
                </span>
              </td>
              <td className="px-4 py-3">
                {factura.fotosEntrega && factura.fotosEntrega.length > 0 ? (
                  <div className="flex gap-1">
                    {factura.fotosEntrega.slice(0, 3).map((foto, idx) => (
                      <button
                        key={idx}
                        onClick={() => setModalFoto({ fotos: factura.fotosEntrega, index: idx })}
                        className="w-10 h-10 rounded border border-slate-300 overflow-hidden hover:border-indigo-500 transition"
                        title="Click para ampliar"
                      >
                        <img
                          src={foto}
                          alt={`Foto ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                    {factura.fotosEntrega.length > 3 && (
                      <div className="w-10 h-10 rounded border border-slate-300 bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-600">
                        +{factura.fotosEntrega.length - 3}
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-slate-400 text-sm flex items-center gap-1">
                    <Image size={16} />
                    Sin fotos
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-sm text-slate-600">
                {factura.observaciones || factura.motivoNoEntrega || '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modal para ver fotos en pantalla completa */}
      {modalFoto && (
        <div className="fixed inset-0 bg-black bg-opacity-95 z-[9999] flex items-center justify-center p-4">
          <button
            onClick={() => setModalFoto(null)}
            className="absolute top-4 right-4 text-white hover:text-slate-300 transition z-[10000] bg-black/50 p-2 rounded-full"
          >
            <X size={32} />
          </button>
          <div className="max-w-6xl w-full max-h-[90vh] flex flex-col items-center justify-center">
            <img
              src={modalFoto.fotos[modalFoto.index]}
              alt={`Foto ${modalFoto.index + 1}`}
              className="max-w-full max-h-[calc(90vh-120px)] h-auto object-contain rounded-lg shadow-2xl"
            />
            <div className="flex justify-center gap-2 mt-4">
              {modalFoto.fotos.map((foto, idx) => (
                <button
                  key={idx}
                  onClick={() => setModalFoto({ fotos: modalFoto.fotos, index: idx })}
                  className={`w-16 h-16 rounded border-2 overflow-hidden transition ${
                    idx === modalFoto.index ? 'border-indigo-500' : 'border-white/30 hover:border-white/60'
                  }`}
                >
                  <img src={foto} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
            <p className="text-white text-center mt-2">
              Foto {modalFoto.index + 1} de {modalFoto.fotos.length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// Tabla de Gastos
const TablaGastos = ({ gastos }) => {
  if (gastos.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <p className="text-slate-500">No hay gastos registrados en esta ruta</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-slate-50">
            <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Tipo</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Descripción</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Monto</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Fecha</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {gastos.map((gasto) => (
            <tr key={gasto.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 text-sm font-medium text-slate-900">{gasto.tipo || 'Otro'}</td>
              <td className="px-4 py-3 text-sm text-slate-700">{gasto.descripcion || '-'}</td>
              <td className="px-4 py-3 text-sm font-medium text-rose-600">
                ${(gasto.monto || 0).toLocaleString()}
              </td>
              <td className="px-4 py-3 text-sm text-slate-600">
                {new Date(gasto.fecha).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DetalleRuta;