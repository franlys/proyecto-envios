// admin_web/src/pages/Reportes.jsx
import { useState, useEffect } from 'react';
import api from '../services/api';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const Reportes = () => {
  const [tipoReporte, setTipoReporte] = useState('rutas');
  const [loading, setLoading] = useState(false);
  const [datosReporte, setDatosReporte] = useState(null);
  
  // Filtros comunes
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [empleadoId, setEmpleadoId] = useState('');
  const [rutaId, setRutaId] = useState('');
  
  // Listas para filtros
  const [empleados, setEmpleados] = useState([]);
  const [rutas, setRutas] = useState([]);

  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  useEffect(() => {
    // Establecer fechas por defecto (último mes)
    const hoy = new Date();
    const hace30Dias = new Date();
    hace30Dias.setDate(hoy.getDate() - 30);
    
    setFechaDesde(hace30Dias.toISOString().split('T')[0]);
    setFechaHasta(hoy.toISOString().split('T')[0]);
  }, []);

  // ✅ CORREGIDO: Aplicando la Regla de Oro
  const cargarDatosIniciales = async () => {
    try {
      const [empleadosRes, rutasRes] = await Promise.all([
        api.get('/empleados/repartidores'),
        api.get('/rutas')
      ]);
      
      // ✅ CORRECCIÓN: Validar success para empleados
      if (empleadosRes.data.success) {
        setEmpleados(empleadosRes.data.data || []);
      } else {
        throw new Error(empleadosRes.data.error || 'Error al cargar empleados');
      }

      // ✅ CORRECCIÓN: Validar success para rutas
      if (rutasRes.data.success) {
        setRutas(rutasRes.data.data || []);
      } else {
        throw new Error(rutasRes.data.error || 'Error al cargar rutas');
      }
      
    } catch (error) {
      console.error('Error cargando datos:', error);
      alert('Error al cargar datos iniciales');
    }
  };

  // ✅ CORREGIDO: Aplicando la Regla de Oro
  const generarReporte = async () => {
    try {
      setLoading(true);
      
      const params = {
        fechaDesde,
        fechaHasta,
        ...(empleadoId && { empleadoId }),
        ...(rutaId && { rutaId })
      };

      let response;
      switch (tipoReporte) {
        case 'rutas':
          response = await api.get('/reportes/rutas', { params });
          break;
        case 'gastos':
          response = await api.get('/reportes/gastos', { params });
          break;
        case 'facturas':
          response = await api.get('/reportes/facturas', { params });
          break;
        default:
          throw new Error('Tipo de reporte no válido');
      }

      // ✅ CORRECCIÓN: Validar success antes de usar los datos
      if (response.data.success) {
        setDatosReporte(response.data.data);
      } else {
        throw new Error(response.data.error || 'Error al generar el reporte');
      }

    } catch (error) {
      console.error('Error:', error);
      alert(error.message || 'Error al generar el reporte');
    } finally {
      setLoading(false);
    }
  };

  const exportarExcel = () => {
    if (!datosReporte) return;

    let datosExcel = [];
    let nombreArchivo = '';

    switch (tipoReporte) {
      case 'rutas':
        nombreArchivo = 'reporte_rutas';
        datosExcel = datosReporte.rutas.map(ruta => ({
          'Fecha': new Date(ruta.fecha).toLocaleDateString(),
          'Ruta': ruta.nombre,
          'Repartidor': ruta.empleadoNombre,
          'Total Facturas': ruta.totalFacturas,
          'Entregadas': ruta.facturasEntregadas,
          'No Entregadas': ruta.facturasNoEntregadas,
          'Porcentaje Entrega': `${ruta.porcentajeEntrega}%`,
          'Monto Asignado': ruta.montoAsignado,
          'Total Gastos': ruta.totalGastos,
          'Balance': ruta.balance
        }));
        break;

      case 'gastos':
        nombreArchivo = 'reporte_gastos';
        datosExcel = datosReporte.gastos.map(gasto => ({
          'Fecha': new Date(gasto.fecha).toLocaleDateString(),
          'Ruta': gasto.rutaNombre,
          'Repartidor': gasto.empleadoNombre,
          'Tipo': gasto.tipoGasto,
          'Descripción': gasto.descripcion,
          'Monto': gasto.monto
        }));
        break;

      case 'facturas':
        nombreArchivo = 'reporte_facturas';
        datosExcel = datosReporte.facturas.map(factura => ({
          'Número Factura': factura.numeroFactura,
          'Cliente': factura.cliente,
          'Dirección': factura.direccion,
          'Monto': factura.monto,
          'Estado': factura.estado,
          'Ruta': factura.rutaNombre || 'Sin asignar',
          'Fecha Intento': factura.fechaIntento ? new Date(factura.fechaIntento).toLocaleDateString() : '',
          'Motivo No Entrega': factura.motivoNoEntrega || ''
        }));
        break;
    }

    const ws = XLSX.utils.json_to_sheet(datosExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
    XLSX.writeFile(wb, `${nombreArchivo}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportarPDF = () => {
    if (!datosReporte) return;

    const doc = new jsPDF();
    let titulo = '';
    let columnas = [];
    let filas = [];

    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');

    switch (tipoReporte) {
      case 'rutas':
        titulo = 'Reporte de Rutas';
        columnas = ['Fecha', 'Ruta', 'Repartidor', 'Facturas', 'Entregadas', '% Entrega', 'Balance'];
        filas = datosReporte.rutas.map(ruta => [
          new Date(ruta.fecha).toLocaleDateString(),
          ruta.nombre,
          ruta.empleadoNombre,
          ruta.totalFacturas,
          ruta.facturasEntregadas,
          `${ruta.porcentajeEntrega}%`,
          `$${ruta.balance}`
        ]);
        break;

      case 'gastos':
        titulo = 'Reporte de Gastos';
        columnas = ['Fecha', 'Ruta', 'Repartidor', 'Tipo', 'Descripción', 'Monto'];
        filas = datosReporte.gastos.map(gasto => [
          new Date(gasto.fecha).toLocaleDateString(),
          gasto.rutaNombre,
          gasto.empleadoNombre,
          gasto.tipoGasto,
          gasto.descripcion,
          `$${gasto.monto}`
        ]);
        break;

      case 'facturas':
        titulo = 'Reporte de Facturas';
        columnas = ['Número', 'Cliente', 'Estado', 'Ruta', 'Monto'];
        filas = datosReporte.facturas.map(factura => [
          factura.numeroFactura,
          factura.cliente,
          factura.estado,
          factura.rutaNombre || 'Sin asignar',
          `$${factura.monto}`
        ]);
        break;
    }

    doc.text(titulo, 14, 15);
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text(`Período: ${fechaDesde} al ${fechaHasta}`, 14, 25);

    doc.autoTable({
      head: [columnas],
      body: filas,
      startY: 35,
      theme: 'grid',
      styles: { fontSize: 10 },
      headStyles: { fillColor: [66, 139, 202] }
    });

    if (datosReporte.resumen) {
      const finalY = doc.lastAutoTable.finalY + 10;
      doc.setFont(undefined, 'bold');
      doc.text('Resumen:', 14, finalY);
      doc.setFont(undefined, 'normal');
      
      let y = finalY + 7;
      Object.entries(datosReporte.resumen).forEach(([key, value]) => {
        doc.text(`${key}: ${value}`, 14, y);
        y += 7;
      });
    }

    doc.save(`${titulo.toLowerCase().replace(/ /g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const renderResumenCards = () => {
    if (!datosReporte?.resumen) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Object.entries(datosReporte.resumen).map(([key, value]) => (
          <div key={key} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
              {key.replace(/_/g, ' ')}
            </p>
            <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">
              {typeof value === 'number' && key.includes('total') ? `$${value}` : value}
            </p>
          </div>
        ))}
      </div>
    );
  };

  const renderTablaRutas = () => {
    if (!datosReporte?.rutas) return null;

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Ruta</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Repartidor</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Facturas</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Entregadas</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">% Entrega</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Asignado</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Gastos</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {datosReporte.rutas.map((ruta, idx) => (
                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{new Date(ruta.fecha).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{ruta.nombre}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{ruta.empleadoNombre}</td>
                  <td className="px-4 py-3 text-sm text-center text-gray-900 dark:text-gray-100">{ruta.totalFacturas}</td>
                  <td className="px-4 py-3 text-sm text-center text-green-600 dark:text-green-400">{ruta.facturasEntregadas}</td>
                  <td className="px-4 py-3 text-sm text-center">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      ruta.porcentajeEntrega >= 90 ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                      ruta.porcentajeEntrega >= 70 ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' :
                      'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                    }`}>
                      {ruta.porcentajeEntrega}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-gray-100">${ruta.montoAsignado}</td>
                  <td className="px-4 py-3 text-sm text-right text-red-600 dark:text-red-400">${ruta.totalGastos}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium">
                    <span className={ruta.balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                      ${ruta.balance}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderTablaGastos = () => {
    if (!datosReporte?.gastos) return null;

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Ruta</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Repartidor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Descripción</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {datosReporte.gastos.map((gasto, idx) => (
                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{new Date(gasto.fecha).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{gasto.rutaNombre}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{gasto.empleadoNombre}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="px-2 py-1 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                      {gasto.tipoGasto}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{gasto.descripcion}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-white">${gasto.monto}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {datosReporte.gastosPorTipo && (
          <div className="p-4 border-t dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Gastos por Tipo</h4>
            <div className="space-y-2">
              {Object.entries(datosReporte.gastosPorTipo).map(([tipo, monto]) => (
                <div key={tipo} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{tipo}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">${monto}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTablaFacturas = () => {
    if (!datosReporte?.facturas) return null;

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Número</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Cliente</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Dirección</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Ruta</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {datosReporte.facturas.map((factura, idx) => (
                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{factura.numeroFactura}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{factura.cliente}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{factura.direccion}</td>
                  <td className="px-4 py-3 text-sm text-center">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      factura.estado === 'entregado' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                      factura.estado === 'no_entregado' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' :
                      'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                    }`}>
                      {factura.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{factura.rutaNombre || 'Sin asignar'}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">${factura.monto}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Reportes</h1>
        <p className="text-gray-600 dark:text-gray-400">Genera reportes detallados del sistema</p>
      </div>

      {/* Selección de tipo de reporte */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-800 dark:text-white mb-4">Configurar Reporte</h2>
        
        {/* Tipo de Reporte */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Tipo de Reporte
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => setTipoReporte('rutas')}
              className={`p-4 rounded-lg border-2 transition-all ${
                tipoReporte === 'rutas'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <span className="text-2xl mb-2 block">🚚</span>
              <h3 className="font-medium text-gray-900 dark:text-white">Reporte de Rutas</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Desempeño por ruta y repartidor
              </p>
            </button>

            <button
              onClick={() => setTipoReporte('gastos')}
              className={`p-4 rounded-lg border-2 transition-all ${
                tipoReporte === 'gastos'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <span className="text-2xl mb-2 block">💰</span>
              <h3 className="font-medium text-gray-900 dark:text-white">Reporte de Gastos</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Gastos detallados por tipo
              </p>
            </button>

            <button
              onClick={() => setTipoReporte('facturas')}
              className={`p-4 rounded-lg border-2 transition-all ${
                tipoReporte === 'facturas'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <span className="text-2xl mb-2 block">📄</span>
              <h3 className="font-medium text-gray-900 dark:text-white">Reporte de Facturas</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Estado de todas las facturas
              </p>
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Fecha Desde
            </label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Fecha Hasta
            </label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Empleado (opcional)
            </label>
            <select
              value={empleadoId}
              onChange={(e) => setEmpleadoId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              {empleados.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.nombre}
                </option>
              ))}
            </select>
          </div>

          {tipoReporte !== 'rutas' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Ruta (opcional)
              </label>
              <select
                value={rutaId}
                onChange={(e) => setRutaId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todas</option>
                {rutas.map((ruta) => (
                  <option key={ruta.id} value={ruta.id}>
                    {ruta.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Botón Generar */}
        <button
          onClick={generarReporte}
          disabled={loading}
          className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
        >
          {loading ? 'Generando...' : 'Generar Reporte'}
        </button>
      </div>

      {/* Resultados del Reporte */}
      {datosReporte && (
        <div>
          {/* Botones de exportación */}
          <div className="flex gap-3 mb-6 justify-end">
            <button
              onClick={exportarExcel}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
            >
              <span>📊</span>
              Exportar Excel
            </button>
            <button
              onClick={exportarPDF}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-2"
            >
              <span>📄</span>
              Exportar PDF
            </button>
          </div>

          {renderResumenCards()}
          {tipoReporte === 'rutas' && renderTablaRutas()}
          {tipoReporte === 'gastos' && renderTablaGastos()}
          {tipoReporte === 'facturas' && renderTablaFacturas()}
        </div>
      )}
    </div>
  );
};

export default Reportes;