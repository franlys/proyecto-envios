// Página de Reportes - Analytics y exportación
import { FileText, Download, TrendingUp } from 'lucide-react';

const Reportes = () => {
  const reportes = [
    { titulo: 'Estado de Resultados', descripcion: 'Ingresos vs Gastos mensual', formato: 'PDF' },
    { titulo: 'Balance General', descripcion: 'Activos, pasivos y patrimonio', formato: 'Excel' },
    { titulo: 'Flujo de Caja', descripcion: 'Movimientos de efectivo', formato: 'PDF' },
    { titulo: 'Reporte Fiscal', descripcion: 'Para declaración de impuestos', formato: 'Excel' }
  ];

  return (
    <div className="h-full overflow-auto bg-slate-50">
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Reportes Financieros</h1>
          <p className="text-sm text-slate-600 mt-1">Genera y descarga reportes detallados de tu empresa</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reportes.map((reporte, idx) => (
            <div key={idx} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-indigo-50 rounded-lg">
                  <FileText className="w-6 h-6 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900">{reporte.titulo}</h3>
                  <p className="text-sm text-slate-600 mt-1">{reporte.descripcion}</p>
                  <div className="mt-4 flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm">
                      <Download className="w-4 h-4" />
                      Descargar {reporte.formato}
                    </button>
                    <span className="text-xs text-slate-500">Última actualización: Hoy</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Sección de gráficos analíticos */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-slate-200 p-12">
          <div className="text-center text-slate-400">
            <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold text-slate-600 mb-2">Gráficos de Tendencias</h3>
            <p className="text-sm text-slate-500">Los gráficos con Recharts se agregarán próximamente</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reportes;
