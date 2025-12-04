// Página de Transacciones - Historial detallado con filtros avanzados
import { useState } from 'react';
import { Search, Filter, Download, Calendar } from 'lucide-react';

const Transacciones = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('todas');

  return (
    <div className="h-full overflow-auto bg-slate-50">
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Historial de Transacciones</h1>
          <p className="text-sm text-slate-600 mt-1">Gestiona y consulta todas las transacciones de tu empresa</p>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar transacciones..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="todas">Todas las transacciones</option>
              <option value="ingresos">Solo Ingresos</option>
              <option value="gastos">Solo Gastos</option>
            </select>

            <button className="flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
              <Calendar className="w-4 h-4" />
              Rango de fechas
            </button>

            <button className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
              <Download className="w-4 h-4" />
              Exportar
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12">
          <div className="text-center text-slate-400">
            <Filter className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold text-slate-600 mb-2">Página en construcción</h3>
            <p className="text-sm text-slate-500">La tabla de transacciones con TanStack Table se implementará próximamente</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Transacciones;
