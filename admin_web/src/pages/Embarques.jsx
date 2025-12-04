// admin_web/src/pages/Embarques.jsx
import { useState, useEffect } from 'react';
import { Search, Edit2, Trash2, Eye, FileText, Package, Calendar, MapPin } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const Embarques = () => {
  const { userData } = useAuth();
  const [embarques, setEmbarques] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadEmbarques();
  }, []);

  const loadEmbarques = async () => {
    try {
      setLoading(true);
      const response = await api.get('/embarques');
      console.log('📦 Embarques cargados:', response.data);
      
      // ✅ CORRECCIÓN: Aplicar la Regla de Oro
      if (response.data.success) {
        setEmbarques(response.data.data || []);
      } else {
        throw new Error(response.data.error || 'Error al cargar embarques desde la API');
      }

    } catch (error) {
      console.error('❌ Error cargando embarques:', error);
      setEmbarques([]);
      alert('Error al cargar embarques: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este embarque?')) {
      try {
        const response = await api.delete(`/embarques/${id}`);
        
        if (response.data.success) {
          alert('✅ Embarque eliminado exitosamente');
          loadEmbarques();
        } else {
          throw new Error(response.data.error || 'Error al eliminar embarque');
        }
      } catch (error) {
        console.error('Error eliminando embarque:', error);
        alert('Error al eliminar embarque: ' + error.message);
      }
    }
  };

  const filteredEmbarques = embarques.filter(embarque =>
    embarque.codigoTracking?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    embarque.origen?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    embarque.destino?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    embarque.nombre?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getEstadoBadge = (estado) => {
    const badges = {
      activo: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200',
      pendiente: 'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200',
      en_proceso: 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200',
      entregado: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200',
      completado: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200',
      inactivo: 'bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200',
      cancelado: 'bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-200'
    };
    return badges[estado] || badges.activo;
  };

  const getEstadoTexto = (estado) => {
    const textos = {
      activo: 'Activo',
      pendiente: 'Pendiente',
      en_proceso: 'En Proceso',
      entregado: 'Entregado',
      completado: 'Completado',
      inactivo: 'Inactivo',
      cancelado: 'Cancelado'
    };
    return textos[estado] || estado;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Embarques</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Los embarques se crean automáticamente desde Google Drive
          </p>
        </div>
      </div>

      {/* Información de actualización automática */}
      <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <Package className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <div>
            <p className="text-sm font-medium text-indigo-900 dark:text-indigo-100">
              Sistema de actualización automática
            </p>
            <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-1">
              Los embarques se sincronizan automáticamente cada 5 minutos desde Google Drive
            </p>
          </div>
        </div>
      </div>

      {/* Búsqueda */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nombre, código, origen o destino..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Tabla de embarques */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Package size={16} />
                    Nombre / Código
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                  Descripción
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} />
                    Fecha Creación
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                  Facturas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                  Progreso
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
              {filteredEmbarques.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <Package className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-500 dark:text-slate-400">
                      {searchTerm ? 'No se encontraron embarques' : 'No hay embarques registrados'}
                    </p>
                    <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">
                      Los embarques se crearán automáticamente al subir archivos a Google Drive
                    </p>
                  </td>
                </tr>
              ) : (
                filteredEmbarques.map((embarque) => (
                  <tr key={embarque.id || embarque._id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {embarque.nombre || embarque.codigoTracking || 'Sin nombre'}
                        </div>
                        {embarque.id && (
                          <div className="text-slate-500 dark:text-slate-400 text-xs">
                            ID: {embarque.id}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-900 dark:text-slate-100 max-w-xs truncate">
                        {embarque.descripcion || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900 dark:text-slate-100">
                        {embarque.fechaCreacion 
                          ? new Date(embarque.fechaCreacion).toLocaleDateString('es-DO', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })
                          : '-'
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getEstadoBadge(embarque.estado || 'activo')}`}>
                        {getEstadoTexto(embarque.estado || 'activo')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900 dark:text-slate-100">
                        <div className="flex items-center gap-2">
                          <FileText size={16} className="text-slate-400" />
                          <span className="font-medium">{embarque.totalFacturas || 0}</span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Entregadas: {embarque.facturasEntregadas || 0}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                          <div 
                            className="bg-emerald-600 h-2 rounded-full transition-all" 
                            style={{ width: `${embarque.porcentajeCompletado || 0}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {embarque.porcentajeCompletado || 0}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => window.location.href = `/embarques/${embarque.id}`}
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300"
                          title="Ver detalles"
                        >
                          <Eye size={18} />
                        </button>
                        {(userData?.rol === 'admin_general' || userData?.rol === 'super_admin') && (
                          <button
                            onClick={() => handleDelete(embarque.id)}
                            className="text-rose-600 dark:text-rose-400 hover:text-rose-900 dark:hover:text-rose-300"
                            title="Eliminar"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Embarques;