// admin_web/src/components/recolecciones/FiltrosRecolecciones.jsx
import { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';

export default function FiltrosRecolecciones({ onFiltrar, onLimpiar }) {
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtros, setFiltros] = useState({
    status: '',
    fecha_inicio: '',
    fecha_fin: '',
    tracking: '',
    destinatario: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFiltros(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onFiltrar(filtros);
  };

  const handleLimpiar = () => {
    const filtrosVacios = {
      status: '',
      fecha_inicio: '',
      fecha_fin: '',
      tracking: '',
      destinatario: ''
    };
    setFiltros(filtrosVacios);
    onLimpiar();
  };

  const estadosBadge = {
    'Recolectado': 'bg-blue-100 text-blue-800',
    'En almacén EE.UU.': 'bg-purple-100 text-purple-800',
    'En contenedor': 'bg-indigo-100 text-indigo-800',
    'En tránsito': 'bg-yellow-100 text-yellow-800',
    'En almacén RD': 'bg-orange-100 text-orange-800',
    'Confirmado': 'bg-teal-100 text-teal-800',
    'En ruta': 'bg-cyan-100 text-cyan-800',
    'Entregado': 'bg-green-100 text-green-800'
  };

  return (
    <div className="bg-white rounded-lg shadow mb-6">
      {/* Header con botón de toggle */}
      <div className="p-4 flex items-center justify-between border-b">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-800">Filtros de Búsqueda</h3>
        </div>
        <button
          onClick={() => setMostrarFiltros(!mostrarFiltros)}
          className="text-blue-600 hover:text-blue-700 font-medium text-sm"
        >
          {mostrarFiltros ? 'Ocultar' : 'Mostrar'} Filtros
        </button>
      </div>

      {/* Formulario de filtros */}
      {mostrarFiltros && (
        <form onSubmit={handleSubmit} className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {/* Búsqueda rápida por tracking */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Search className="w-4 h-4 inline mr-1" />
                Búsqueda Rápida
              </label>
              <input
                type="text"
                name="tracking"
                value={filtros.tracking}
                onChange={handleChange}
                placeholder="Buscar por tracking o nombre de destinatario..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Estado */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado
              </label>
              <select
                name="status"
                value={filtros.status}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos los estados</option>
                <option value="Recolectado">Recolectado</option>
                <option value="En almacén EE.UU.">En almacén EE.UU.</option>
                <option value="En contenedor">En contenedor</option>
                <option value="En tránsito">En tránsito</option>
                <option value="En almacén RD">En almacén RD</option>
                <option value="Confirmado">Confirmado</option>
                <option value="En ruta">En ruta</option>
                <option value="Entregado">Entregado</option>
              </select>
            </div>

            {/* Fecha desde */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha Desde
              </label>
              <input
                type="date"
                name="fecha_inicio"
                value={filtros.fecha_inicio}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Fecha hasta */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha Hasta
              </label>
              <input
                type="date"
                name="fecha_fin"
                value={filtros.fecha_fin}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Destinatario */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre Destinatario
              </label>
              <input
                type="text"
                name="destinatario"
                value={filtros.destinatario}
                onChange={handleChange}
                placeholder="Nombre del destinatario..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-3">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
            >
              <Filter className="w-4 h-4" />
              Aplicar Filtros
            </button>
            <button
              type="button"
              onClick={handleLimpiar}
              className="flex items-center gap-2 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              <X className="w-4 h-4" />
              Limpiar Filtros
            </button>
          </div>

          {/* Filtros activos */}
          {(filtros.status || filtros.tracking || filtros.fecha_inicio || filtros.destinatario) && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-gray-600 mb-2">Filtros activos:</p>
              <div className="flex flex-wrap gap-2">
                {filtros.status && (
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${estadosBadge[filtros.status] || 'bg-gray-100 text-gray-800'}`}>
                    Estado: {filtros.status}
                  </span>
                )}
                {filtros.tracking && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                    Tracking: {filtros.tracking}
                  </span>
                )}
                {filtros.destinatario && (
                  <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                    Destinatario: {filtros.destinatario}
                  </span>
                )}
                {filtros.fecha_inicio && (
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                    Desde: {new Date(filtros.fecha_inicio).toLocaleDateString()}
                  </span>
                )}
                {filtros.fecha_fin && (
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                    Hasta: {new Date(filtros.fecha_fin).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          )}
        </form>
      )}
    </div>
  );
}